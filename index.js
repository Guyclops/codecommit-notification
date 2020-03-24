const AWS = require("aws-sdk");
const Slack = require("slack-node");
const moment = require("moment-timezone");
const slack = new Slack();
const slack_url = process.env.SLACK_URL;
let slack_color;
const slack_channel = process.env.SLACK_CHANNEL;
const slack_name = process.env.SLACK_NAME;
const slack_icon = process.env.SLACK_ICON;
slack.setWebhook(slack_url);

exports.handler = (event, context) => {
  const records = JSON.parse(event.Records[0].Sns.Message);
  const detail = records.detail;
  const subject = detail.title;
  const region = records.region;
  const repository = detail.repositoryNames[0];
  const isMerged = detail.isMerged === undefined ? false : detail.isMerged === "True" ? true : false;
  let status = detail.pullRequestStatus;
  if(isMerged) status = "Merged";
  if(status === "Closed") slack_color = "#ed6240";
  else slack_color = "#36a64f";
  const timestamp = moment(event.Records[0].Sns.Timestamp).tz("Asia/Seoul").unix();
  const branchName = detail.sourceReference.split("/")[2];
  const commitId = detail.sourceCommit;
  const title_link = detail.notificationBody.substring(detail.notificationBody.indexOf("https"), detail.notificationBody.length - 1);

  const codecommit = new AWS.CodeCommit({ apiVersion: "2015-04-13", region: region });
  codecommit.getCommit({ commitId: commitId, repositoryName: repository }, (err, data) => {
    if (err) return context.fail(err);
    const commit = data.commit;
    const msg = commit.message;
    const authorName = commit.author.name + " <" + commit.author.email + ">";
    const slackMessage = {
      text: "* " + subject + " *",
      attachments: [
        {
          color: slack_color,
          author_name: authorName,
          title: "CodeCommit Notification",
          title_link: title_link,
          fields: [
            {
              title: "Action",
              value: status,
              short: false
            },
            {
              title: "Branch",
              value: branchName,
              short: false
            },
            {
              title: "Message",
              value: msg,
              short: false
            }
          ],
          ts: timestamp
        }
      ]
    };
    slack.webhook({
      channel: slack_channel,
      username: slack_name,
      icon_emoji: slack_icon,
      ...slackMessage
    }, (err, response) => {
      console.log(response);
    })
  });
};
