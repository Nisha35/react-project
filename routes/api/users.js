const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const normalize = require('normalize-url');

const User = require('../../models/User');

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    // see if user exists
    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }
      // Gravatar stands for Globally Recognized Avatar. ... When a user leaves a comment (with email) on a site that supports Gravatar,
      // it pulls their Globally Recognized Avatar from Gravatar servers. Then that picture is shown next to the comment.
      // This allows each commenter to have their identity through out the world wide web

      //  get user gravatar
      // s-size
      // r- rating
      // d-deafult mm-feafult image
      const avatar = normalize(
        gravatar.url(email, {
          s: '200',
          r: 'pg',
          d: 'mm'
        }),
        { forceHttps: true }
      );

      // pass to db
      // it just create new user
      // for save we have to use .save method
      user = new User({
        name,
        email,
        avatar,
        password
      });

      // encrypt password

      // A cryptographic salt is made up of random bits added to each password instance before its hashing.
      //  Salts create unique passwords even in the instance of two users choosing the same passwords
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // in mongo after adding any field it will create _id
      // then mongooes cobert it into id
      const payload = {
        user: {
          id: user.id
        }
      };

      // return jsonwebtoken
      // token required at ui

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
