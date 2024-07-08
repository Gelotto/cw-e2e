import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { HttpBatchClient, Tendermint37Client } from "@cosmjs/tendermint-rpc";

export type BatchRpcClientOptions = {
  batchSizeLimit: number;
  dispatchInterval: number;
};

export default class CosmWasmBatchRpcClient extends CosmWasmClient {
  /**
   * Default max size of a batch of RPC requests before the batch is cut and sent.
   */
  static get defaultBatchSizeLimit(): number {
    return 100;
  }

  /**
   * Default interval duration during which requests accumulate in the pending
   * batch. Unless the batch size limit was already reached, the current batch
   * is sent at the end of each interval.
   */
  static get defaultDispatchInterval(): number {
    return 200;
  }

  /**
   *
   * @param endpoint RPC url
   * @param options client options
   * @returns CosmWasmBatchRpcClient
   */
  static async connect(endpoint?: string, options?: BatchRpcClientOptions) {
    return new this(
      await Tendermint37Client.create(
        new HttpBatchClient(endpoint ?? "http://127.0.0.1:26657", {
          batchSizeLimit: options?.batchSizeLimit ?? this.defaultBatchSizeLimit,
          dispatchInterval:
            options?.dispatchInterval ?? this.defaultDispatchInterval,
        }),
      ),
    );
  }
}
