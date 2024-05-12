const passport  = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = (passport) => {
  passport.use(new LocalStrategy({
    usernameField: 'userId',
    passwordField: 'password',
  },
  async (userId, password, done) => {
    try {
      const user = await prisma.users.findUnique({ where: { userId } });
      if (!user) {
        return done(null, false, { message: '존재하지 않는 사용자입니다.' });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return done(null, false, { message: '잘못된 비밀번호입니다.' });
      }
      return done(null, user);
    } catch (err) {
      console.error(err);
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.users.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};