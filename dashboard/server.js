require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Kafka } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// hook up to confluent cloud
const kafka = new Kafka({
  clientId: 'dashboard-app',
  brokers: [process.env.KAFKA_BROKER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET
  }
});

const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL,
  auth: {
    username: process.env.SCHEMA_REGISTRY_API_KEY,
    password: process.env.SCHEMA_REGISTRY_API_SECRET
  }
});

const consumer = kafka.consumer({ groupId: 'dashboard-group-' + Date.now() });
const producer = kafka.producer();

async function runKafka() {
  await producer.connect();
  await consumer.connect();
  
  // listen to the firehose and the fraud alerts
  await consumer.subscribe({ topic: 'raw_orders', fromBeginning: false });
  await consumer.subscribe({ topic: 'fraudulent_orders', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const decodedValue = await registry.decode(message.value);
        io.emit(topic, decodedValue);
      } catch (err) {
        console.error('schema decoding failed:', err);
      }
    },
  });
}

// manual trigger for the demo
app.post('/inject-fraud', async (req, res) => {
  try {
    const orderId = `ORD-FRAUD-${Math.floor(Math.random() * 1000)}`;
    const fraudulentOrder = {
      order_id: orderId,
      user_id: 'USER-999',
      amount: 5500.0 // force trigger the >$1k rule
    };

    const schemaId = await registry.getLatestSchemaId('raw_orders-value');
    const encodedPayload = await registry.encode(schemaId, fraudulentOrder);

    await producer.send({
      topic: 'raw_orders',
      messages: [{ value: encodedPayload }],
    });

    res.json({ success: true, injectedOrder: fraudulentOrder });
  } catch (error) {
    console.error('injection failed:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
  runKafka().catch(console.error);
});
