import { PantallaCategorias } from '../../../categorias/PantallaCategorias';

// La misma pantalla de Categorías de la T007, reutilizada desde Cuenta en
// modo lectura: sin crear, editar ni borrar (T013).
export default function RutaCategoriasCuenta() {
  return <PantallaCategorias soloLectura />;
}
