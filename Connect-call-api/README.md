# Amazon Connect API calls

Use to describe the contact and user receiving the contactId.

## Describe Contact

### Params
- InstanceId
- ContactId

### Response
Contact: {
    Arn: string,
    Id: string,
    InitiationMethod: string,
    Channel: string,
    QueueInfo: {
      Id: string,
      EnqueueTimestamp: Date
    },
    AgentInfo: {
      Id: 'string,
      ConnectedToAgentTimestamp: Date
    },
    InitiationTimestamp: Date,
    DisconnectTimestamp: Date,
    LastUpdateTimestamp: Date
  }
}

## Decribe User

### Params
- InstanceId
- UserId

### Response

User: {
    Id: string,
    Arn: string,
    Username: string,
    IdentityInfo: {
      FirstName: string,
      LastName: string,
      Email: string
    },
    PhoneConfig: {
      PhoneType: string,
      AutoAccept: bool,
      AfterContactWorkTimeLimit: int,
      DeskPhoneNumber: string
    },
    DirectoryUserId: string,
    SecurityProfileIds: string[],
    RoutingProfileId: string,
    HierarchyGroupId: string,
    Tags: {}
  }
}