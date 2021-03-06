import {
  expect as expectCDK,
  haveResourceLike,
} from '@aws-cdk/assert-internal';
import '@aws-cdk/assert-internal/jest';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import {
  AutoScalingGroup,
  AutoScalingGroupRequireImdsv2Aspect,
  CfnLaunchConfiguration,
} from '../../lib';

describe('AutoScalingGroupRequireImdsv2Aspect', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'Stack');
    vpc = new ec2.Vpc(stack, 'Vpc');
  });

  test('warns when metadataOptions is a token', () => {
    // GIVEN
    const asg = new AutoScalingGroup(stack, 'AutoScalingGroup', {
      vpc,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
    });
    const launchConfig = asg.node.tryFindChild('LaunchConfig') as CfnLaunchConfiguration;
    launchConfig.metadataOptions = fakeToken();
    const aspect = new AutoScalingGroupRequireImdsv2Aspect();

    // WHEN
    cdk.Aspects.of(stack).add(aspect);

    // THEN
    expectCDK(stack).notTo(haveResourceLike('AWS::AutoScaling::LaunchConfiguration', {
      MetadataOptions: {
        HttpTokens: 'required',
      },
    }));
    expect(asg.node.metadataEntry).toContainEqual({
      data: expect.stringContaining('CfnLaunchConfiguration.MetadataOptions field is a CDK token.'),
      type: 'aws:cdk:warning',
      trace: undefined,
    });
  });

  test('requires IMDSv2', () => {
    // GIVEN
    new AutoScalingGroup(stack, 'AutoScalingGroup', {
      vpc,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
    });
    const aspect = new AutoScalingGroupRequireImdsv2Aspect();

    // WHEN
    cdk.Aspects.of(stack).add(aspect);

    // THEN
    expectCDK(stack).to(haveResourceLike('AWS::AutoScaling::LaunchConfiguration', {
      MetadataOptions: {
        HttpTokens: 'required',
      },
    }));
  });
});

function fakeToken(): cdk.IResolvable {
  return {
    creationStack: [],
    resolve: (_c) => {},
    toString: () => '',
  };
}
