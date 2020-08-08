use env_logger;
use std::env;
use std::{convert::Infallible};
use rweb::*;

use ecstask::task_informer_client::TaskInformerClient;

pub mod ecstask {
    tonic::include_proto!("ecstask.v1");
}

#[get("/")]
async fn index() -> Result<String, Infallible> {
    let endpoint: String =
        env::var("GRPC_SERVER_ENDPOINT").expect("GRPC_SERVER_ENDPOINT not found");

    let mut client = TaskInformerClient::connect(endpoint).await.expect("connection");

    let response = client.get(()).await.expect("error");
    let task_id = response.into_inner().id;

    Ok(format!("Task: {}", task_id))
}

#[tokio::main]
async fn main() {
    env_logger::init();
    rweb::serve(index()).run(([0, 0, 0, 0], 3000)).await;
}
