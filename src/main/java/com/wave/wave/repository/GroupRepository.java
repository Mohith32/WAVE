package com.wave.wave.repository;

import com.wave.wave.model.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GroupRepository extends JpaRepository<ChatGroup, UUID> {
}
