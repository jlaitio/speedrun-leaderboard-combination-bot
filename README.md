# Speedrun leaderboard mediawiki combinator 

A Serverless Framework project for automatic scheduling of combining speedrun leaderboards and posting them to a MediaWiki site. Implemented for Super Metroid, with data sources for speedrun.com and deertier.com, but adaptable for any sources provided you implement the data source logic.

## Usage

What you need to set this up yourself:
* Basic knowledge of NodeJS/TypeScript, AWS (Lambda / Cloudwatch) and Serverless Framework
* Bot role credentials to the wiki in question (to avoid captchas)
* An AWS account to deploy the service and related credentials to

1. Set up your wiki credentials to AWS SSM Parameter Store
2. Configure your wiki info and credential references to `wiki-config.json`
3. Optionally create the built-in fallback `extra-user-mapping.json` and/or set it up as a wiki page (with a single table containing the user mappings)
4. Make any needed code logic modifications
5. Set up your AWS account credentials in your development environment and `sls deploy`
