import core = require('@aws-cdk/core')
import iam = require('@aws-cdk/aws-iam')
import ec2 = require('@aws-cdk/aws-ec2')
import ecr = require('@aws-cdk/aws-ecr')
import ecs = require('@aws-cdk/aws-ecs')
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2')
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns')
import { FargatePlatformVersion } from '@aws-cdk/aws-ecs'
import { SecurityGroup } from '@aws-cdk/aws-ec2'

const app = new core.App()

const appName = app.node.tryGetContext("app_name")

class BaseStack extends core.Stack {
    vpc: ec2.Vpc
    cluster: ecs.Cluster
    
    constructor(scope: core.App, id: string, props: core.StackProps = {}) {
        super(scope, id, props)

        const clusterName = id

        this.vpc = new ec2.Vpc(this, 'base', {
            cidr: '10.6.0.0/16',
            natGateways: 1
        })

        this.cluster = new ecs.Cluster(this, 'cluster', {
            vpc: this.vpc,
            clusterName: clusterName
        })
    }
}

class RepositoryStack extends core.Stack {
    repository: ecr.Repository
    
    constructor(scope: core.App, id: string, name: string, props: core.StackProps = {}) {
        super(scope, id, props)

        this.repository = new ecr.Repository(this, 'repository', {
            repositoryName: name
        })
    }
}

class ServerStack extends core.Stack {
    base: BaseStack
    loadBalancer: elbv2.ILoadBalancerV2
    
    constructor(scope: core.App, id: string, base: BaseStack, repositoryStack: RepositoryStack, props: core.StackProps = {}) {
        super(scope, id, props)
        this.base = base

        const task = new ecs.FargateTaskDefinition(this, 'task', {
            cpu: 256,
            memoryLimitMiB: 512,
        })
        const container = task.addContainer('default', {
            image: ecs.ContainerImage.fromEcrRepository(repositoryStack.repository),
            environment: {
                RUST_LOG: 'debug',
            },
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'sophie-grpc-ecs-server' })
        })
        container.addPortMappings({
            containerPort: 9051,
        })

        const serviceSecurityGroup = new ec2.SecurityGroup(this, `service-security-group`, {
            vpc: this.base.vpc,
            allowAllOutbound: true,
            description: 'SG for the service on fargate'
        })
        serviceSecurityGroup.addIngressRule(ec2.Peer.ipv4(this.base.vpc.vpcCidrBlock), ec2.Port.tcp(9051), 'gRPC port')

        const service = new ecs.FargateService(this, 'service', {
            serviceName: 'grpc-server',
            cluster: this.base.cluster,
            taskDefinition: task,
            desiredCount: 2,
            platformVersion: FargatePlatformVersion.VERSION1_4,
            securityGroups: [ serviceSecurityGroup ]
        })

        const loadBalancer = new elbv2.NetworkLoadBalancer(this, 'lb', {
            vpc: this.base.vpc,
            internetFacing: false,
            crossZoneEnabled: true
        })
        const listener = loadBalancer.addListener('listener', { port: 80 })
        listener.addTargets('grpc', {
          port: 9051,
          targets: [service]
        })

        this.loadBalancer = loadBalancer
    }
}

class ClientStack extends core.Stack {
    base: BaseStack
    
    constructor(scope: core.App, id: string, base: BaseStack, serverStack: ServerStack, repositoryStack: RepositoryStack, props: core.StackProps = {}) {
        super(scope, id, props)
        this.base = base

        const task = new ecs.FargateTaskDefinition(this, 'task', {
            cpu: 256,
            memoryLimitMiB: 512,
        })
        const container = task.addContainer('default', {
            image: ecs.ContainerImage.fromEcrRepository(repositoryStack.repository),
            environment: {
                'GRPC_SERVER_ENDPOINT': serverStack.loadBalancer.loadBalancerDnsName,
            },
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'sophie-grpc-ecs-client' })
        })
        container.addPortMappings({
            containerPort: 8080,
        })

        const serviceSecurityGroup = new ec2.SecurityGroup(this, `service-security-group`, {
            vpc: this.base.vpc,
            allowAllOutbound: true,
            description: 'SG for the service on fargate'
        })
        serviceSecurityGroup.addIngressRule(ec2.Peer.ipv4(this.base.vpc.vpcCidrBlock), ec2.Port.tcp(8080), 'api port')

        const service = new ecs.FargateService(this, 'service', {
            serviceName: 'grpc-client',
            cluster: this.base.cluster,
            taskDefinition: task,
            desiredCount: 1,
            platformVersion: FargatePlatformVersion.VERSION1_4,
            securityGroups: [ serviceSecurityGroup ]
        })

        const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'lb', {
            vpc: this.base.vpc,
            internetFacing: true,
        })
        const listener = loadBalancer.addListener('listener', { port: 80 })
        listener.addTargets('api', {
          port: 8080,
          targets: [service]
        })
    }
}

const baseStack = new BaseStack(app, appName, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

const serverRepository = new RepositoryStack (app, `${appName}-server-repository`, 'areasophie/grpc-ecs-server', {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

const serverStack = new ServerStack(app, `${appName}-server`, baseStack, serverRepository, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

const clientRepository = new RepositoryStack (app, `${appName}-client-repository`, 'areasophie/grpc-ecs-client', {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

new ClientStack(app, `${appName}-client`, baseStack, serverStack, clientRepository, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

app.synth()
