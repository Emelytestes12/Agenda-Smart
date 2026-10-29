import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importação das rotas das 6 telas
import whatsappRoutes from './src/routes/whatsappRoutes.js';
import agendamentosRoutes from './src/routes/agendamentosRoutes.js';
import clientesRoutes from './src/routes/clientesRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import filaRoutes from './src/routes/filaRoutes.js';
import minhaAgendaRoutes from './src/routes/minhaAgendaRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Conectando os endpoints das 6 telas
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fila', filaRoutes);
app.use('/api/minha-agenda', minhaAgendaRoutes);

app.get('/', (req, res) => {
  res.send('Backend do Agenda Smart rodando perfeitamente!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});