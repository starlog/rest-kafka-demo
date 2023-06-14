import { Kafka, Partitioners } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import MessageQueue from './tool/MessageQueue';

let consumer;
let producer;

const KAFKA_CLIENT_ID = 'demoClient14';
const KAFKA_GROUP_ID = 'demoGroup14';
const KAFKA_CLIENT_ID_PROD = 'demoClientProd1';

const KAFKA_MESSAGE_KEY_SEND = 'FelixTestMessage_out';
const KAFKA_MESSAGE_KEY_RECEIVE = 'FelixTestMessage_in';
const kafkaBroker = [
  'common.b1.kafka.internal:9092',
  'common.b2.kafka.internal:9092',
  'common.b3.kafka.internal:9092',
];

const TTL_SECONDS = 10;
const messageQueue = new MessageQueue(TTL_SECONDS);

//--------------------------------------------------------------------------------------------------
// 초기화 및 Kafka Consumer/Producer 생성
//--------------------------------------------------------------------------------------------------
export async function init() {
  try {
    console.log('init start.');

    const kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: kafkaBroker,
    });

    const kafkaProd = new Kafka({
      clientId: KAFKA_CLIENT_ID_PROD,
      brokers: kafkaBroker,
    });

    // Consumer 생성
    consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
    await consumer.connect();
    await consumer.subscribe({ topic: 'felix_demo', fromBeginning: true });

    // Producer 생성
    producer = kafkaProd.producer({ createPartitioner: Partitioners.LegacyPartitioner });
    await producer.connect();

    // Consumer 구동
    //----------------------------------------------------------------------------------------------
    await consumer.run({
      eachMessage: async ({
        topic,
        partition,
        message,
      }) => {
        // 원하는 메시지 (key가 KAFKA_MESSAGE_KEY_RECEIVE)인 경우에만 처리)
        if (message.key.toString() === KAFKA_MESSAGE_KEY_RECEIVE) {
          console.log(`[KafkaConsumer] topic:${topic}, partition:${partition}, offset:${message.offset}`);
          const dataObject = JSON.parse(message.value.toString());
          console.log(`[KafkaConsumer] Saving to message queue:${dataObject?.uuid}`);
          await messageQueue.push(dataObject?.uuid, dataObject, TTL_SECONDS);
        }
      },
    });

    console.log('init done.');
    return true;
  } catch (ex) {
    console.log(`init error:${ex}`);
  }
  return false;
}

//--------------------------------------------------------------------------------------------------
async function sendSingleMessageToKafka(uuid:string) {
  try {
    const dataObject = {
      uuid,
      type: 'myType',
      description: 'description1',
    };

    const message = {
      key: KAFKA_MESSAGE_KEY_SEND,
      value: JSON.stringify(dataObject),
    };
    console.log(`Sending:${JSON.stringify(message)}`);
    await producer.send({
      topic: 'felix_demo',
      messages: [message],
    });
    return true;
  } catch (ex) {
    console.log(`sendSingleMessageToKafka error:${ex}`);
  }
  return false;
}

/**
 * REST & Message Queue
 * sample app
 *
 * returns demoResponse
 * */
//--------------------------------------------------------------------------------------------------
// REST API 호출 부분
//--------------------------------------------------------------------------------------------------
export async function demoRequest() {
  try {
    const examples = {
      result: 'result',
    };
    // 요청을 메시지로 전송한다.
    const uuid = uuidv4();
    const sendResult:boolean = await sendSingleMessageToKafka(uuid);
    console.log(`sendResult:${sendResult}`);

    let resultMessage = null;
    // 원하는 메시지가 도착할때 까지 기다린다.
    while (!resultMessage) {
      resultMessage = await messageQueue.get(uuid);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }

    console.log(`messageQueue length = ${messageQueue.length()}`);
    examples.result = resultMessage;
    return examples;
  } catch (ex) {
    return { result: ex.message };
  }
}
