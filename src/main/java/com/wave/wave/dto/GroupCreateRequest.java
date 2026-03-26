package com.wave.wave.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class GroupCreateRequest {

    @NotBlank(message = "Group name is required")
    private String groupName;

    private String description;

    private List<String> memberIds;

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getMemberIds() { return memberIds; }
    public void setMemberIds(List<String> memberIds) { this.memberIds = memberIds; }
}
