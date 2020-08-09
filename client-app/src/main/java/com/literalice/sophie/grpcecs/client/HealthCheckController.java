package com.literalice.sophie.grpcecs.client;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/")
public class HealthCheckController {
    @RequestMapping(method=RequestMethod.GET)
    public String healthcheck() {
        return "OK";
    }
}
