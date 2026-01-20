const {validationResult } = require('express-validator');

const validateRequest = (rules) => {
  return [
    // Apply validation rules
    rules,
    // Handle validation errors
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
  ];
};

module.exports = validateRequest;