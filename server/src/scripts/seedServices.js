require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

const services = [
  {
    title: 'Visita técnica',
    description: 'Avaliação técnica no local. Preço e duração definidos após avaliação.',
  },
  {
    title: 'Limpeza de placas solares',
    description: 'Limpeza dos módulos solares. Preço e duração definidos após avaliação.',
  },
  {
    title: 'Manutenção corretiva',
    description: 'Diagnóstico e correção de falhas. Preço e duração definidos após avaliação.',
  },
  {
    title: 'Instalação de carregador veicular',
    description: 'Instalação de carregador veicular. Preço e duração definidos após avaliação.',
  },
  {
    title: 'Instalação de sistema solar',
    description: 'Instalação de sistema de energia solar. Preço e duração definidos após avaliação.',
  },
];

async function seedServices() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI não está configurada.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  for (const service of services) {
    await Service.updateOne(
      { title: service.title },
      {
        $setOnInsert: {
          ...service,
          durationMinutes: 15,
          price: 0,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  console.log(`${services.length} serviços verificados/criados.`);
}

seedServices()
  .catch((error) => {
    console.error('Erro ao cadastrar serviços:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
