import '@aws-cdk/assert-internal/jest';
import { expect, haveResource, MatchStyle } from '@aws-cdk/assert-internal';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as constructs from 'constructs';
import * as autoscaling from '../lib';

describe('scheduled action', () => {
  test('can schedule an action', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const asg = makeAutoScalingGroup(stack);

    // WHEN
    asg.scaleOnSchedule('ScaleOutInTheMorning', {
      schedule: autoscaling.Schedule.cron({ hour: '8', minute: '0' }),
      minCapacity: 10,
    });

    // THEN
    expect(stack).to(haveResource('AWS::AutoScaling::ScheduledAction', {
      Recurrence: '0 8 * * *',
      MinSize: 10,
    }));


  });

  test('correctly formats date objects', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const asg = makeAutoScalingGroup(stack);

    // WHEN
    asg.scaleOnSchedule('ScaleOutInTheMorning', {
      schedule: autoscaling.Schedule.cron({ hour: '8' }),
      startTime: new Date(Date.UTC(2033, 8, 10, 12, 0, 0)), // JavaScript's Date is a little silly.
      minCapacity: 11,
    });

    // THEN
    expect(stack).to(haveResource('AWS::AutoScaling::ScheduledAction', {
      StartTime: '2033-09-10T12:00:00Z',
    }));


  });

  test('have timezone property', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const asg = makeAutoScalingGroup(stack);

    // WHEN
    asg.scaleOnSchedule('ScaleOutAtMiddaySeoul', {
      schedule: autoscaling.Schedule.cron({ hour: '12', minute: '0' }),
      minCapacity: 12,
      timeZone: 'Asia/Seoul',
    });

    // THEN
    expect(stack).to(haveResource('AWS::AutoScaling::ScheduledAction', {
      MinSize: 12,
      Recurrence: '0 12 * * *',
      TimeZone: 'Asia/Seoul',
    }));

  });

  test('autoscaling group has recommended updatepolicy for scheduled actions', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const asg = makeAutoScalingGroup(stack);

    // WHEN
    asg.scaleOnSchedule('ScaleOutInTheMorning', {
      schedule: autoscaling.Schedule.cron({ hour: '8' }),
      minCapacity: 10,
    });

    // THEN
    expect(stack).toMatch({
      Resources: {
        ASG46ED3070: {
          Type: 'AWS::AutoScaling::AutoScalingGroup',
          Properties: {
            MaxSize: '1',
            MinSize: '1',
            LaunchConfigurationName: { Ref: 'ASGLaunchConfigC00AF12B' },
            Tags: [
              {
                Key: 'Name',
                PropagateAtLaunch: true,
                Value: 'Default/ASG',
              },
            ],
            VPCZoneIdentifier: [
              { Ref: 'VPCPrivateSubnet1Subnet8BCA10E0' },
              { Ref: 'VPCPrivateSubnet2SubnetCFCDAA7A' },
            ],
          },
          UpdatePolicy: {
            AutoScalingRollingUpdate: {
              WaitOnResourceSignals: false,
              PauseTime: 'PT0S',
              SuspendProcesses: [
                'HealthCheck',
                'ReplaceUnhealthy',
                'AZRebalance',
                'AlarmNotification',
                'ScheduledActions',
              ],
            },
            AutoScalingScheduledAction: {
              IgnoreUnmodifiedGroupSizeProperties: true,
            },
          },
        },
      },
      Parameters: {
        SsmParameterValueawsserviceamiamazonlinuxlatestamznamihvmx8664gp2C96584B6F00A464EAD1953AFF4B05118Parameter: {
          Type: 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
          Default: '/aws/service/ami-amazon-linux-latest/amzn-ami-hvm-x86_64-gp2',
        },
      },
    }, MatchStyle.SUPERSET);


  });
});

function makeAutoScalingGroup(scope: constructs.Construct) {
  const vpc = new ec2.Vpc(scope, 'VPC');
  return new autoscaling.AutoScalingGroup(scope, 'ASG', {
    vpc,
    instanceType: new ec2.InstanceType('t2.micro'),
    machineImage: new ec2.AmazonLinuxImage(),
    updateType: autoscaling.UpdateType.ROLLING_UPDATE,
  });
}
