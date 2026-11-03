# Rokt - Identity

[Thiago Mata](../README.md)

| &nbsp;    | &nbsp;                                              |
|-----------|-----------------------------------------------------|
| Company:  | Rokt                                                |
| Position: | Senior Software Engineer                            |
| Summary:  | We developed the identity services to improve the company's personalization and relevance of the offers by better identifying the events related to each customer. |

##  Rokt

<div style="background-color: white; display: flex; justify-content: center; align-items: center; height: 100px;">
<img src="../img/rokt.svg" style="height:90px;"/>
</div>
---

Rokt is a technology company specializing in e-commerce marketing. It provides personalized transaction moments to enhance customer engagement and revenue. As of 2023, Rokt has over 500 million users and is valued at approximately $2.4 billion. Rokt has partnerships with notable companies such as Uber, Ticketmaster, Fanatics, and Live Nation.

I worked at Rokt as a Senior Software Engineer for five years. My work involved developing services in a high-performance, high-availability, scalable platform that processes billions of monthly transactions to deliver personalized and relevant offers to millions of users worldwide.

## Customer Identification

| &nbsp; | &nbsp; |
|--------|--------|
| One key factor to improve the offers' relevance is properly identifying the customer. That requires connecting multiple touchpoints and devices to a single customer using a multi-hop high-connected graph. We also needed to guarantee customer data privacy, residency, and client data isolation and encryption. We tested several approaches to improve customer identification accuracy and speed, including graph databases. The right approach must be cost-effective, scalable, and secure, with low latency, ensuring zero downtime, proper monitoring, alarms and failover. | <img width="1000px" src="../img/identity.svg"> |

## Impact

The new identification system works in real-time, using open-source technologies, key-value databases, and cloud services. It better identifies customers through multi-hop customer identifiers in a fraction of the time and with a fraction of the resources. By using the new system, the company could experiment with different approaches to customer identification and evaluate and use new identifiers and strategies to improve customer identification.

## Technologies

- Scala
- Spark Batch
- Spark Streaming
- Apache Kafka
- AWS EMR
- AWS Athena
- AWS Neptune
- Apache TinkerPop

## Other Cases At Rokt

- [Conversion Attribution](./rokt-attribution.md)
- [Bot Detection](./rokt-bot-detection.md)
