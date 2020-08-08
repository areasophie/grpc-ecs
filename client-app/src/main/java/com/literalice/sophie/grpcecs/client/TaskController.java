package com.literalice.sophie.grpcecs.client;

import java.util.concurrent.TimeUnit;

import com.google.protobuf.Empty;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import ecstask.v1.TaskInformerGrpc;
import ecstask.v1.Ecstask.TaskInformerResponse;

@RestController
@RequestMapping("/task")
public class TaskController {

    private ManagedChannel channel;

    public TaskController(@Value("${GRPC_SERVER_ENDPOINT}") String grpcServerEndpoint) {
        this.channel = ManagedChannelBuilder.forTarget(grpcServerEndpoint)
            .usePlaintext()
            .keepAliveTime(30, TimeUnit.SECONDS)
            .build();
    }

    @RequestMapping(method=RequestMethod.GET)
    public String task() {
        TaskInformerGrpc.TaskInformerBlockingStub stub = TaskInformerGrpc.newBlockingStub(channel);
        TaskInformerResponse reply = stub.get(Empty.newBuilder().build());

        return reply.getId();
    }
}
