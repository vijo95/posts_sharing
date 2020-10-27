const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { UserInputError } = require('apollo-server')


const { validateRegisterInput, validateLoginInput } = require('../../util/validators')
const { SECRET_KEY } = require('../../config')
const User = require('../../models/User')

function generateToken(res){
  return jwt.sign({
    id: res.id,
    email: res.email,
    username: res.username
  }, SECRET_KEY, { expiresIn: '1h'})
}

module.exports = {
  Mutation: {

    // Login User
    async login(_, { username, password }){
      const { errors, valid } = validateLoginInput(username, password)
      const user = await User.findOne({ username })

      if(!valid){
        throw new UserInputError('Invalid Input', { errors })
      }

      if(!user){
        errors.general = 'User not found'
        throw new UserInputError('User not found', { errors })
      }

      const match = await bcrypt.compare(password, user.password)

      if(!match){
        errors.general = 'Wrong Credentials'
        throw new UserInputError('Wrong Credentials', { errors })
      }

      const token = generateToken(user)

      return {
        ...user._doc,
        id: user._id,
        token
      }
    },

    // Registration of New User
    async register(parent, { registerInput:{ username, email, password, confirmPassword } }, context, info){
      
      // Check Informations is Valid
      const { valid, errors } = validateRegisterInput(username, email, password, confirmPassword)
      if(!valid){
        throw new UserInputError('Errors', { errors })
      }

      // Check username is Valid
      const user = await User.findOne({ username })
      if(user){
        throw new UserInputError('username is taken', {
          errors: {
            username: 'This username is taken'
          }
        })
      }

      // Register User hashing password
      password = await bcrypt.hash(password, 12)

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString()
      })

      const res = await newUser.save()

      const token = generateToken(res)

      return {
        ...res._doc,
        id: res._id,
        token
      }
    },
    
  }
}

