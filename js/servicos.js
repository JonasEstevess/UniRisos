/* Uni Risos — tratamentos oferecidos. Usado pelo site e pelo app. */
(function () {
  'use strict';
  var UR = (window.UR = window.UR || {});
  UR.services = [
    { id: 'avaliacao', name: 'Avaliação e limpeza', short: 'Check-up e profilaxia', desc: 'Check-up completo, profilaxia e orientação de higiene para manter tudo em dia.', icon: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z M9 12l2 2 4-4' },
    { id: 'restauracao', name: 'Restaurações e onlays', short: 'Forma e função do dente', desc: 'Devolvem forma e função ao dente com acabamento natural, na cor do seu sorriso.', icon: 'M12 3l8 5-8 5-8-5z M4 13l8 5 8-5' },
    { id: 'clareamento', name: 'Clareamento dental', short: 'Dentes mais claros', desc: 'Dentes mais claros com segurança e acompanhamento profissional do começo ao fim.', icon: 'M12 3v6 M12 15v6 M3 12h6 M15 12h6 M6 6l3 3 M15 15l3 3 M18 6l-3 3 M9 15l-3 3' },
    { id: 'odontopediatria', name: 'Odontopediatria', short: 'Atendimento infantil', desc: 'Atendimento paciente e lúdico para os pequenos criarem uma boa relação com o dentista.', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 14c1.5 2.5 6.5 2.5 8 0 M9 9.5v.5 M15 9.5v.5' },
    { id: 'ortodontia', name: 'Ortodontia', short: 'Aparelhos e alinhamento', desc: 'Aparelhos para alinhar os dentes e corrigir a mordida em qualquer idade.', icon: 'M3 12h18 M5.5 9h3v6h-3z M10.5 9h3v6h-3z M15.5 9h3v6h-3z' },
    { id: 'canal', name: 'Tratamento de canal', short: 'Alívio da dor', desc: 'Alivia a dor e salva o dente, com anestesia eficiente e muito cuidado.', icon: 'M7 3c-3 0-4 3-3 6 1 3 1 5 1.5 8 .3 2 2 2 2.5 0l1-4c.3-1.5 1.7-1.5 2 0l1 4c.5 2 2.2 2 2.5 0 .5-3 .5-5 1.5-8 1-3 0-6-3-6-2 0-2.5 1-4 1S9 3 7 3z' },
    { id: 'implante', name: 'Implantes', short: 'Reposição de dentes', desc: 'Reposição de dentes perdidos com fixação segura e resultado natural.', icon: 'M9 3h6l-1 5h-4z M9 11h6 M9.5 14h5 M10.5 17h3 M12 8v13' },
    { id: 'protese', name: 'Próteses', short: 'Coroas sob medida', desc: 'Coroas e próteses sob medida para você voltar a mastigar e sorrir com confiança.', icon: 'M4 8l4 4 4-7 4 7 4-4-2 11H6z' }
  ];
})();
