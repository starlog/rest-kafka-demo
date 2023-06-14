# rest-kafka-demo

Process overview

```mermaid
flowchart TB
    call<-->rest
    subgraph server1
    rest--> kafkaMessage-prod-server1
    KafkaMessage-receive-->MessageQueue
    MessageQueue --> rest
    end
    subgraph server2
    kafkaMessage-prod-server1 --> receive
    receive-->working 
    working --> kafkaMessage-prod-server2
    kafkaMessage-prod-server2 --> KafkaMessage-receive
    end
```

To run<br>
compile.sh - npm install and tsc<br>
run-server1.sh - run server 1<br>
run-server2.sh - run server 2<br>

test.sh - send REST request to server 1<br>
