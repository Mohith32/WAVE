package com.wave.wave.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootController {

    @GetMapping({"/", "/healthz"})
    public Map<String, Object> root() {
        return Map.of(
                "status", "ok",
                "service", "wave-backend",
                "message", "See /actuator/health for details"
        );
    }
}
