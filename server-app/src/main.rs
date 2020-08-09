extern crate reqwest;

use env_logger;
use log::{info};
use std::env;
use serde_json::Value;

use tonic::{transport::Server, Request, Response, Status};

use ecstask::task_informer_server::{TaskInformer, TaskInformerServer};
use ecstask::{TaskInformerResponse};

pub mod ecstask {
    tonic::include_proto!("ecstask.v1");
}

#[derive(Debug, Default)]
pub struct TaskInformerImpl {}

#[tonic::async_trait]
impl TaskInformer for TaskInformerImpl {
    async fn get(
        &self,
        request: Request<()>,
    ) -> Result<Response<TaskInformerResponse>, Status> {
        info!("Got a request: {:?}", request);

        let container_metadata_endpoint = env::var("ECS_CONTAINER_METADATA_URI").expect("ECS_CONTAINER_METADATA_URI not found");
        let task_metadata_endpoint = container_metadata_endpoint + "/task";
        let task_api_response = reqwest::get(&task_metadata_endpoint).await.expect("error on get");
        let task_json: Value = task_api_response.json().await.expect("error on parse");
        info!("Task Metadata: {:?}", &task_json);

        let origin = task_json["TaskARN"].as_str().unwrap();
        let response = ecstask::TaskInformerResponse {
            id: origin.to_string()
        };
        Ok(Response::new(response))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    let (mut health_reporter, health_service) = tonic_health::server::health_reporter();
    health_reporter
    .set_serving::<TaskInformerServer<TaskInformerImpl>>()
    .await;

    let addr = "0.0.0.0:9051".parse()?;
    let informer = TaskInformerImpl::default();

    Server::builder()
        .add_service(health_service)
        .add_service(TaskInformerServer::new(informer))
        .serve(addr)
        .await?;

    Ok(())
}
