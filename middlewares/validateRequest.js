// export const validateRequest = (schema) => {
//   return (req, res, next) => {
//     const { error, value } = schema.validate(req.body, {
//       abortEarly: false,
//       convert: true,
//     });
//     if (error) {
//       const details = error.details.map((d) => d.message);
//       return res.status(400).json({ errors: details });
//     }
//     req.body = value;
//     next();
//   };
// };


export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) });
    }
    next();
  };
};
