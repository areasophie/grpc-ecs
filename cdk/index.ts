import core = require('@aws-cdk/core')
import iam = require('@aws-cdk/aws-iam')
import ec2 = require('@aws-cdk/aws-ec2')
import ecr = require('@aws-cdk/aws-ecr')
import ecs = require('@aws-cdk/aws-ecs')
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns')
import { FargatePlatformVersion } from '@aws-cdk/aws-ecs'

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
        // const spotASG = this.cluster.addCapacity('spot', {
        //     instanceType: new ec2.InstanceType("t3.large"),
        //     minCapacity: 2,
        //     maxCapacity: 5,
        //     spotPrice: '0.1'
        // })

        // new core.CfnOutput(this, "spot-asg-name", {
        //     value: spotASG.autoScalingGroupName,
        //     exportName: "spot-asg-name"
        // })
    }
}

class ServerStack extends core.Stack {
    base: BaseStack
    
    constructor(scope: core.App, id: string, base: BaseStack, props: core.StackProps = {}) {
        super(scope, id, props)
        this.base = base

        const repository = new ecr.Repository(this, 'server-repository', {
            repositoryName: 'areasophie/grpc-ecs-server'
        })

        const taskImage: ecs_patterns.NetworkLoadBalancedTaskImageOptions = {
            image: ecs.ContainerImage.fromEcrRepository(repository),
            containerPort: 50051,
            environment: {
                RUST_LOG: 'info',
            }
        }

        const loadBalancedService = new ecs_patterns.NetworkLoadBalancedFargateService(this, "grpc-server", {
            serviceName: 'grpc-server',
            cluster: this.base.cluster,
            platformVersion: FargatePlatformVersion.VERSION1_4,
            cpu: 256,
            memoryLimitMiB: 512,
            desiredCount: 2,
            publicLoadBalancer: false,
            taskImageOptions: taskImage,
        })

        // const cfnResource = loadBalancedService.service.node.children[0] as ecs.CfnService
        
        // cfnResource.addDeletionOverride("Properties.LaunchType")
        //  
        // loadBalancedService.taskDefinition.addToTaskRolePolicy(
        //     new iam.PolicyStatement({
        //         actions: [
        //             'ecs:ListTasks',
        //             'ecs:DescribeTasks'
        //         ],
        //         resources: ['*']
        //     })
        // )
    }
}

const baseStack = new BaseStack(app, appName, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

const serverStack = new ServerStack(app, `${appName}-server`, baseStack, {
    env: {
        region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'
    },
})

app.synth()
