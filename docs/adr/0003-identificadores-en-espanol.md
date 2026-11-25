# Identificadores en español, sin tildes

La documentación, los comentarios, los textos de la interfaz y los nombres propios de este repo van en español. Los archivos, las funciones y los paquetes no llevan tildes ni eñes. Los nombres que vienen de React, de Expo o del sistema no se traducen.

Se consideró dejar los identificadores en inglés. La tarea es académica y el grupo pidió el repo en español, así que se descartó. También se consideró usar tildes en los nombres. El toolchain no las acepta bien, así que se descartó.

Los hooks propios se llaman `use` más un nombre en español, nunca `usar*`. El prefijo `use` es un nombre de React y no se traduce a `usar`: el compilador de React solo reconoce `/^use[A-Z0-9]/`. El resto del identificador sigue en español, sin tildes.

Se consideró traducir el prefijo a `usar` para alinearlo con el resto de identificadores. Se descartó: el compilador no los trataría como hooks.
