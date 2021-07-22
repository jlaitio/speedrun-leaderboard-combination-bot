import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'silution-bot-super-metroid',
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    }
  },
  plugins: ['serverless-webpack'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    region: 'eu-west-1',
    timeout: 120,
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['ssm:GetParameter'],
        Resource: ["arn:aws:ssm:${self:provider.region}:*:parameter/silution/*"]
      }
    ],
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    },
    lambdaHashingVersion: '20201221',
  },
  functions: {
    postCombinedLeaderboardsToWiki: {
      handler: 'src/handler.postCombinedLeaderboardsToWiki',
      events: [{
        schedule: {
          rate: 'rate(1 day)'
        }
      }]
    }
  }
}

module.exports = serverlessConfiguration;
