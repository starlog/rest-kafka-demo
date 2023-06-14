// eslint-disable-next-line import/no-extraneous-dependencies
import { Kafka, Partitioners } from 'kafkajs';
import { randomUUID } from 'crypto';

let consumer;
let producer;

const KAFKA_CLIENT_ID = 'demoClient20';
const KAFKA_GROUP_ID = 'demoGroup20';

const KAFKA_CLIENT_ID_PROD = 'demoClientProd20';

const KAFKA_MESSAGE_KEY_SEND = 'FelixTestMessage_in';
const KAFKA_MESSAGE_KEY_RECEIVE = 'FelixTestMessage_out';

const kafkaBroker = [
  'common.b1.kafka.internal:9092',
  'common.b2.kafka.internal:9092',
  'common.b3.kafka.internal:9092',
];

//--------------------------------------------------------------------------------------------------
async function init() {
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

    console.log('init end.');
  } catch (error) {
    console.error(`init error:${error}`);
  }
}

//--------------------------------------------------------------------------------------------------
async function sendSingleMessageToKafka(uuid:string) {
  try {
    //----------------------------------------------------------------------------------------------
    // uuid 필드에 요청 메시지를 구분할 수 있는 값을 넣는다.
    // extraData 필드를 생성해서, 서버에서 처리한 결과를 시뮬레이션 한다.
    //----------------------------------------------------------------------------------------------
    const dataObject = {
      uuid,
      type: 'myType',
      description: 'description data from server2',
      extraData: randomUUID(), // 처리한 결과 데이터를 시뮬레이션
    };

    //----------------------------------------------------------------------------------------------
    // key 필드에 전송 목적지를 구별할 수 있는 값을 넣는다. 전송/수신을 동일한 토픽을 사용하기 때문이다.
    // 만약 전송/수신을 다른 토픽을 사용한다면 key 필드를 이용한 구별은 필요하지 않다.
    //----------------------------------------------------------------------------------------------
    const message = {
      key: KAFKA_MESSAGE_KEY_SEND,
      value: JSON.stringify(dataObject),

    };
    console.log(`[Kafka Producer] Sending:${JSON.stringify(message)}`);
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

//--------------------------------------------------------------------------------------------------
// Kafka consumer server start
//--------------------------------------------------------------------------------------------------
async function run() {
  await consumer.run({
    eachMessage: async ({
      topic,
      partition,
      message,
    }) => {
      //--------------------------------------------------------------------------------------------
      // 원하는 오브잭트만 처리
      //--------------------------------------------------------------------------------------------
      if (message.key.toString() === KAFKA_MESSAGE_KEY_RECEIVE) {
        console.log(`topic:${topic}, partition:${partition}, offset:${message.offset}`);
        const dataObject = JSON.parse(message.value.toString());
        console.log(`received dataObject:${JSON.stringify(dataObject)}`);
        //------------------------------------------------------------------------------------------
        // 처리하는데 시간이 걸리는것을 시뮬레이션
        //------------------------------------------------------------------------------------------
        await new Promise((resolve) => setTimeout(resolve, 20));
        console.log(`sending dataObject.uuid:${dataObject.uuid}`);
        await sendSingleMessageToKafka(dataObject.uuid);
      }
    },
  });
}
//--------------------------------------------------------------------------------------------------
async function main() {
  await init();
  await run();
}
//--------------------------------------------------------------------------------------------------
main().then(() => {
  console.log('started.');
});
