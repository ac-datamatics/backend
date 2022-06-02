const aws = require('aws-sdk');
const connect = new aws.Connect();

exports.handler = async (event) => {
    let instanceId = "" 
    const contactParams = {
        ContactId: event.ContactId,
        InstanceId: instanceId
    };
    
    let res = await connect.describeContact(contactParams).promise()
    let queueId = res.Contact.QueueInfo.Id
    let agentId = res.Contact.AgentInfo.Id
    
    const userParams = {
        InstanceId: instanceId,
        UserId: agentId
    }
    
    let agent = await connect.describeUser(userParams).promise()
    let agentUsername = agent.User.Username
    
    
    let response = {
        QueueId: queueId,
        UserName: agentUsername
    }
    return response
};