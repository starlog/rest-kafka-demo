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

    //----------------------------------------------------------------------------------------------
    // Kafka Client 생성
    // ----------------------------------------------------------------------------------------------
    const kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: kafkaBroker,
    });

    //----------------------------------------------------------------------------------------------
    // Kafka Producer 생성
    //----------------------------------------------------------------------------------------------
    const kafkaProd = new Kafka({
      clientId: KAFKA_CLIENT_ID_PROD,
      brokers: kafkaBroker,
    });

    //----------------------------------------------------------------------------------------------
    // Consumer 생성
    //----------------------------------------------------------------------------------------------
    consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
    await consumer.connect();
    await consumer.subscribe({ topic: 'felix_demo', fromBeginning: true });

    //----------------------------------------------------------------------------------------------
    // Producer 생성
    //----------------------------------------------------------------------------------------------
    producer = kafkaProd.producer({ createPartitioner: Partitioners.LegacyPartitioner });
    await producer.connect();

    //----------------------------------------------------------------------------------------------
    // Consumer 구동
    //----------------------------------------------------------------------------------------------
    await consumer.run({
      eachMessage: async ({
        topic,
        partition,
        message,
      }) => {
        //------------------------------------------------------------------------------------------
        // 원하는 메시지 (key가 KAFKA_MESSAGE_KEY_RECEIVE)인 경우에만 처리)
        //------------------------------------------------------------------------------------------
        if (message.key.toString() === KAFKA_MESSAGE_KEY_RECEIVE) {
          console.log(`[KafkaConsumer] topic:${topic}, partition:${partition}, offset:${message.offset}`);
          const dataObject = JSON.parse(message.value.toString());
          console.log(`[KafkaConsumer] Saving to message queue:${dataObject?.uuid}`);
          //----------------------------------------------------------------------------------------
          // TTL 시간까지만 저장해서 필요없는 메시지를 자동으로 삭제한다. (데모를 위해서 짧게 저장함.)
          //----------------------------------------------------------------------------------------
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
    //----------------------------------------------------------------------------------------------
    // uuid 필드에 요청 메시지를 구분할 수 있는 값을 넣는다.
    //----------------------------------------------------------------------------------------------
    const dataObject = {
      uuid,
      type: 'myType',
      description: 'description1',
    };

    //----------------------------------------------------------------------------------------------
    // key 필드에 전송 목적지를 구별할 수 있는 값을 넣는다. 전송/수신을 동일한 토픽을 사용하기 때문이다.
    // 만약 전송/수신을 다른 토픽을 사용한다면 key 필드를 이용한 구별은 필요하지 않다.
    //----------------------------------------------------------------------------------------------
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
    //----------------------------------------------------------------------------------------------
    // 요청을 메시지로 전송한다.
    //----------------------------------------------------------------------------------------------
    const uuid = uuidv4();
    const sendResult:boolean = await sendSingleMessageToKafka(uuid);
    console.log(`sendResult:${sendResult}`);

    //----------------------------------------------------------------------------------------------
    // 원하는 메시지가 도착할때 까지 기다린다.
    //----------------------------------------------------------------------------------------------
    let resultMessage = null;
    while (!resultMessage) {
      resultMessage = await messageQueue.get(uuid);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }

    //----------------------------------------------------------------------------------------------
    // 응답을 REST 로 return 한다.
    //----------------------------------------------------------------------------------------------
    console.log(`messageQueue length = ${messageQueue.length()}`);
    examples.result = resultMessage;
    return examples;
  } catch (ex) {
    return { result: ex.message };
  }
}
