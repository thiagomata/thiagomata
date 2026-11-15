# Rokt - Bot Detection

[Thiago Mata](../README.md)

| &nbsp;    | &nbsp;                                              |
|-----------|-----------------------------------------------------|
| Company:  | Rokt                                                |
| Position: | Senior Software Engineer                            |
| Summary:  | We developed the bot detection project to identify and block malicious bots affecting the company's revenue, customer experience and platform performance. |

##  Rokt

<div style="background-color: white; display: flex; justify-content: center; align-items: center; height: 100px;">
<img src="../img/rokt.svg" style="height:90px;"/>
</div>

---

Rokt is a technology company specializing in e-commerce marketing. It provides personalized transaction moments to enhance customer engagement and revenue. As of 2023, Rokt has over 500 million users and is valued at approximately $2.4 billion. Rokt has partnerships with notable companies such as Uber, Ticketmaster, Fanatics, and Live Nation.

I worked at Rokt as a Senior Software Engineer for five years. My work involved developing services in a high-performance, high-availability, scalable platform that processes billions of monthly transactions to deliver personalized and relevant offers to millions of users worldwide.


## Protection Against Malicious Bots

| &nbsp; | &nbsp; |
|--------|--------|
| We developed the bot detection project to identify and block malicious bots affecting the company's revenue, customer experience and the platform's performance. Its evaluations must run in real-time to avoid affecting the user experience. We also need to store the explanation of each decision as a way to audit the system. The company needs a rule engine to evaluate the impact of suggested and existing rules without affecting the customer experience. | <img width="1000px" src="../img/bot1.jpg"> |

## Impact

The Bot Detection project monitors all the public requests to the company's platform, identifying and blocking malicious bots in real time. This project significantly impacts the company's requests and revenue, as it blocks malicious bots that create many fake transactions, affecting the performance of clients' campaigns. With the new reports, the company can detect new patterns, propose new rules, measure their impact, and keep improving the system.

## Technologies

- Go
- Istio
- Envoy Proxy
- WASM
- Kubernetes
- Kafka
- Snowflake
- Apache Superset

## Other Cases At Rokt

- [Conversion Attribution](./rokt-attribution.md)
- [Customer Identification](./rokt-identity.md)
