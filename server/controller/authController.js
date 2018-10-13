import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../db';

export const createUser = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'incomplete parameters',
    });
  }
  const query = `
      INSERT INTO Users (username, password, role) VALUES($1, $2, $3) RETURNING *;
      `;
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
  return db.getClient().then(client => client
    .query(query, [username, hashedPassword, 'user'])
    .then((dbRes) => {
      const user = dbRes.rows[0];
      const authUser = {
        userid: user.userid,
        username: user.username,
        role: user.role,
      }; 
      return res.status(201).json({
        success: true,
        message: 'user succesfully created',
        data: {
          user: authUser,
          token: jwt.sign(authUser, process.env.JWT_SECRET, {
            expiresIn: '1h',
          }),
        },
      });
    })
    .catch(() => {
      res.status(400).json({
        success: false,
        message: 'db error - sign up not successful',
      });
    })
    .then(client.release()));
};

export const getUser = async (username, client) => {
  const query = `
          SELECT *
          FROM Users
          WHERE username = $1
          LIMIT 1
      `;

  return client.query(query, [username]).then(res => res.rows[0]);
};

export const loginUser = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'incomplete parameters',
    });
  }
  return db.getClient().then(client => getUser(username, client)
    .then((user) => {
      if (bcrypt.compareSync(password, user.password)) {
        const authUser = {
          userid: user.userid,
          username: user.username,
          role: user.role,
        };
        return res.status(200).json({
          success: true,
          message: 'user found',
          data: {
            user: authUser,
            token: jwt.sign(authUser, process.env.JWT_SECRET, {
              expiresIn: '1h',
            }),
          },
        });
      }
      return res.status(400).json({
        success: false,
        message: 'invalid password',
      });
    })
    .catch(() => res.status(400).json({
      success: false,
      message: 'db error - login not successful',
    }))
    .then(() => client.release()));
};
