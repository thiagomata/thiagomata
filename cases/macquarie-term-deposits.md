# Macquarie Bank — Term deposit accounts, opened in minutes

[Thiago Mata](../README.md)

**Position:** Senior Manager

**Dates:** 2024–Present

## Summary

I contributed to a cross-team effort to bring term deposit account creation from days to minutes. I advocated for evidence-based change, validation across services, and repeatable testing throughout delivery.

## The challenge

The previous term deposit account creation process took days. Replacing that established, bureaucratic process with a leaner digital experience required more than making an individual service faster.

The project was a substantial cross-team effort. The customer journey depended on the teams delivering a coherent experience together, while maintaining confidence in the behaviour of the complete system.

## Delivering across teams

I contributed to the wider team delivery of a new digital term deposit experience at Macquarie Bank. The result allows accounts to be created in minutes rather than days.

Getting there required collaboration across teams, flexibility, and adjustments to what needed to be done as the work progressed. Changes needed to fit the wider journey, rather than only work within an individual team’s part of it.

## Managing change through evidence

I advocated for and promoted an evidence-based approach to the transition, prioritizing and helping design A/B tests, feature flags, and dashboards that compared results against the source of truth.

We built real-time comparisons of old and new integration results and reconciliation reports that sampled accounts across products to check values against our cache. These checks made differences visible and supported investigation throughout the change.

Load and stress tests exposed potential issues that we addressed before the official release.

## Validating the complete journey

I promoted validation beyond individual components. My team defined, designed, and built a tool that let us mock inputs in the test environment and check their impact across our microservices.

We continuously added scenarios to these end-to-end tests, expanding coverage as the work evolved. This gave us a repeatable way to examine how changes affected the wider system, alongside integration and component tests.

## Making quality part of delivery

I advocated for services that could be tested fully on a developer’s machine and validated through CI/CD. We changed our services and workflows to support local testing and debugging, automated tests in CI/CD, and integration tests in the release pipeline.

Performance monitoring in metrics dashboards and reconciliation reports complemented the tests. Together, these practices made validation part of the delivery process and kept behaviour easier to inspect as teams adapted the implementation.

These improvements extend beyond this release, providing a reusable foundation for future initiatives.

## Customer impact

Account creation moved from days to minutes. For customers, that means a shorter wait between choosing a term deposit and opening their account.

Together, these tests and quality checks helped us deliver a smooth transition to the new pipeline, with no incidents related to the change and a better customer experience—opening accounts in minutes instead of days.

The outcome was delivered through a collective effort across teams. My contribution was part of that shared delivery.

## Explore further

[Macquarie's term deposit product page](https://www.macquarie.com.au/everyday-banking/term-deposits.html)
