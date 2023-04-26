import { check, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import Usuario from '../models/Usuario.js';
import { generarId } from '../helpers/tokens.js';
import { emailRegistro, emailOlvidePassword } from '../helpers/emails.js';

const formularioLogin = (req, res) => {
  res.render('auth/login', {
    pagina: 'Iniciar Sesión'
  });
};

const formularioRegistro = (req, res) => {
  console.log(req.csrfToken());
  res.render('auth/registro', {
    pagina: 'Crear Cuenta',
    csrfToken: req.csrfToken()
  });
};

const confirmar = async (req, res) => {
  const { token } = req.params;

  // verifica token valido

  const usuario = await Usuario.findOne({ where: { token } });

  if (!usuario) {
    return res.render('auth/confirmar-cuenta', {
      pagina: 'Error al confirmar cuenta',
      mensaje: 'Hubo un error al confirmar tu cuenta, intenta nuevamente',
      error: true
    });
  }

  // Confirmar la cuenta
  usuario.token = null;
  usuario.confirmado = true;

  await usuario.save();
  res.render('auth/confirmar-cuenta', {
    pagina: 'Cuenta confirmada',
    mensaje: 'La cuenta se confirmo correctamente'
  });
};

const formularioOlvidePassword = (req, res) => {
  res.render('auth/olvide-password', {
    pagina: 'Recupera tu acceso a bienes raices',
    csrfToken: req.csrfToken()
  });
};

const resetPassword = async (req, res) => {
  await check('email').isEmail().withMessage('Eso no parece un email').run(req);
  let resultado = validationResult(req);
  if (!resultado.isEmpty()) {
    //Errores
    return res.render('auth/olvide-password', {
      pagina: 'Recupera tu acceso a bienes raices',
      csrfToken: req.csrfToken(),
      errores: resultado.array()
    });
  }
  const { email } = req.body;
  const usuario = await Usuario.findOne({ where: { email } });
  if (!usuario) {
    return res.render('auth/olvide-password', {
      pagina: 'Recupera tu acceso a bienes raices',
      csrfToken: req.csrfToken(),
      errores: [{ msg: 'El email no pertenece a nigun usuario' }]
    });
  }

  usuario.token = generarId();
  await usuario.save();
  emailOlvidePassword({
    email: usuario.email,
    nombre: usuario.nombre,
    token: usuario.token
  });

  res.render('templates/mensaje', {
    pagina: 'Restablece tu password',
    mensaje: 'Hemos enviado un email con las instrucciones'
  });
};

const comprobarToken = async (req, res) => {
  console.log('entraa');
  const { token } = req.params;
  const usuario = await Usuario.findOne({ where: { token } });
  if (!usuario) {
    return res.render('auth/confirmar-cuenta', {
      pagina: 'Reestablece tu password',
      mensaje: 'Hubo un error al validar tu informacion, intenta nuevamente',
      error: true
    });
  }
  res.render('auth/reset-password', {
    pagina: ' Restablece tu password',
    csrfToken: req.csrfToken()
  });
};

const nuevoPassword = async (req, res) => {
  await check('password')
    .isLength({ min: 6 })
    .withMessage('El password debe ser de al menos 6 caracteres')
    .run(req);

  let resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    //Errores
    return res.render('auth/reset-password', {
      pagina: 'Restablece tu password',
      csrfToken: req.csrfToken(),
      errores: resultado.array()
    });
  }

  const { token } = req.params;
  const { password } = req.body;

  const usuario = await Usuario.findOne({ where: { token } });

  // hashear el password
  const salt = await bcrypt.genSalt(10);
  usuario.password = await bcrypt.hash(password, salt);
  usuario.token = null;

  await usuario.save();

  res.render('auth/confirmar-cuenta', {
    pagina: 'Password Reestablecido',
    mensaje: 'El password se guardo correctamente'
  });
};

const registrar = async (req, res) => {
  //Validaciones
  await check('nombre')
    .notEmpty()
    .withMessage('El nombre no puede ir vacio')
    .run(req);

  await check('email').isEmail().withMessage('Eso no parece un email').run(req);

  await check('password')
    .isLength({ min: 6 })
    .withMessage('El password debe ser de al menos 6 caracteres')
    .run(req);

  await check('repetir_password')
    .equals(req.body.password)
    .withMessage('Los password no son iguales')
    .run(req);

  let resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    //Errores
    return res.render('auth/registro', {
      pagina: 'Crear Cuenta',
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      usuario: {
        nombre: req.body.nombre,
        email: req.body.email
      }
    });
  }

  const { nombre, email, password } = req.body;
  const existeUsuario = await Usuario.findOne({
    where: { email }
  });
  if (existeUsuario) {
    return res.render('auth/registro', {
      pagina: 'Crear Cuenta',
      csrfToken: req.csrfToken(),
      errores: [{ msg: 'El usuario ya existe' }],
      usuario: {
        nombre: nombre,
        email: email
      }
    });
  }
  const usuario = await Usuario.create({
    nombre,
    email,
    password,
    token: generarId()
  });

  emailRegistro({
    nombre: usuario.nombre,
    email: usuario.email,
    token: usuario.token
  });

  res.render('templates/mensaje', {
    pagina: 'Cuenta creada correctamente',
    mensaje: 'Hemos enviado un email de confirmacion, presiona el enlace'
  });
};

export {
  formularioLogin,
  formularioRegistro,
  formularioOlvidePassword,
  registrar,
  confirmar,
  resetPassword,
  comprobarToken,
  nuevoPassword
};
