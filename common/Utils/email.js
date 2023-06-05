const nodemailer = require('nodemailer');
const pug = require('pug');

const {
  EMAIL_HOST,
  EMAIL_PORT,
  FROM_EMAIL_USER,
  FROM_EMAIL_PWD,
  SENDGRID_USER,
  SENDGRID_PWD,
} = process.env;

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.url = url;
    this.firstName = user.userName.split(' ')[0];
    this.from = 'skystarseenu@gmail.com';
  }

  addNewTransport() {
    if (process.env.NODE_ENV === 'development')
      return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        auth: {
          user: FROM_EMAIL_USER,
          pass: FROM_EMAIL_PWD,
        },
      });

    if (process.env.NODE_ENV === 'production')
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: SENDGRID_USER,
          pass: SENDGRID_PWD,
        },
      });
  }

  async send(template, subject) {
    const html = pug.renderFile(
      `${__dirname}/../../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        subject: subject,
        url: this.url,
      }
    );

    const mailerOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
    };

    await this.addNewTransport().sendMail(mailerOptions);
  }

  async sendResetTokenMail() {
    await this.send(
      'sendResetToken',
      'Your reset password url is generated !!'
    );
  }
};
