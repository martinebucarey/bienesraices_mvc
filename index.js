import express from 'express';
import usuarioRoutes from './routes/usuarioRoutes.js';
import db from './config/db.js';

const app = express();

// Habilitar lectura de datos de formularios
app.use(express.urlencoded({ extended: true }));

//Conexion a la base de datos

try {
  await db.authenticate();
  db.sync();
  console.log('Conexion correcta a la base de datos');
} catch (error) {
  console.error(error);
}
//Hablitar Pug
app.set('view engine', 'pug');
app.set('views', './views');

//Carpeta publica
app.use(express.static('public'));

//Routing
app.use('/auth', usuarioRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`El servidor esta en el puerto ${port}`);
});
