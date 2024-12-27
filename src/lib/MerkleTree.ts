import crypto, { BinaryLike, createHash } from "crypto";
import { promises as fs } from "fs";
import { flatten } from "underscore";
import { faker } from "@faker-js/faker";

export default class MerkleTree {
  nodes: Buffer[];
  size: number;

  constructor({ size, nodes }: { size?: number; nodes?: Buffer[] } = {}) {
    this.nodes = nodes ?? [];
    this.size = size ?? 0;
  }

  private hash(data: BinaryLike): Buffer {
    return crypto.createHash("sha256").update(data).digest();
  }

  static digestToHex(digest: Buffer) {
    return digest.toString("hex");
  }

  get root(): string | null {
    if (this.nodes) {
      return MerkleTree.digestToHex(this.nodes[this.nodes.length - 1]);
    }
    return null;
  }

  build(leaves: string[]): MerkleTree {
    let layer = leaves.map((x) => this.hash(x));

    const layers: Buffer[][] = [layer];

    while (layer.length > 1) {
      if (layer.length % 2) {
        layer.push(layer[layer.length - 1]);
      }

      const nextLayer: Buffer[] = [];

      layers.push(nextLayer);

      for (let i = 0; i < layer.length; i += 2) {
        const siblings = layer.slice(i, i + 2).sort(Buffer.compare);
        const hash = this.hash(Buffer.concat(siblings));
        nextLayer.push(hash);
      }

      layer = nextLayer;
    }
    this.nodes = flatten(layers);

    this.size = leaves.length;
    if (leaves.length % 2) {
      this.size += 1;
    }
    return this;
  }

  prove(leafIndex: number): string[] {
    const proof: string[] = [];
    let index = leafIndex;
    let layerStartIndex = 0;
    let layerSize = this.size;

    while (layerSize > 1) {
      // Get the current layer's start and end indices
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

      // console.log({
      //   index,
      //   siblingIndex,
      //   layerStartIndex,
      //   layerSize,
      // });

      // Push sibling to proof
      let hexDigest = "";
      if (siblingIndex >= layerSize) {
        hexDigest = MerkleTree.digestToHex(
          this.nodes[layerStartIndex + siblingIndex - 1],
        );
      } else {
        hexDigest = MerkleTree.digestToHex(
          this.nodes[layerStartIndex + siblingIndex],
        );
      }

      proof.push(hexDigest);

      // Move to the next layer
      index = Math.floor(index / 2);
      layerStartIndex += layerSize + (layerSize % 2);
      layerSize = Math.ceil(layerSize / 2);
    }

    return proof;
  }

  async proveFromFile(
    filePath: string,
    layerLeafIndex: number,
    size: number,
  ): Promise<string[] | null> {
    const proof: string[] = [];
    const file = await fs.open(filePath, "r");

    let index = layerLeafIndex;
    let layerStartIndex = 0;
    let layerSize = size;

    while (layerSize > 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

      // If the sibling index is out of bounds, we add the last element of the layer
      if (siblingIndex >= layerSize) {
        proof.push(
          await this.readNodeAtOffset(
            file,
            (layerStartIndex + siblingIndex - 1) * 33,
          ),
        );
      } else {
        proof.push(
          await this.readNodeAtOffset(
            file,
            (layerStartIndex + siblingIndex) * 33,
          ),
        );
      }

      // Move to the next layer
      index = Math.floor(index / 2);
      layerStartIndex += layerSize;
      layerSize = Math.ceil(layerSize / 2);
    }

    return proof;
  }

  private async readNodeAtOffset(
    file: fs.FileHandle,
    offset: number,
  ): Promise<string> {
    const buffer = Buffer.alloc(32); // Allocate buffer to read 32 bytes (representing the hash)
    const { bytesRead } = await file.read(buffer, 0, 32, offset);

    // Ensure we read exactly 32 bytes, then return the hex representation of the buffer
    if (bytesRead === 32) {
      // Convert the 32-byte buffer to a hex string and return
      return buffer.toString("hex");
    }

    throw new Error(
      `Unable to read node at offset ${offset}, expected 32 bytes but got ${bytesRead}`,
    );
  }

  verify(leaf: string, proof: string[]): boolean {
    let hash = this.hash(leaf);
    for (let i = 0; i < proof.length; i++) {
      const siblingHash = proof[i];
      let siblings = [hash, Buffer.from(siblingHash, "hex")].sort(
        Buffer.compare,
      );
      hash = this.hash(Buffer.concat(siblings));
    }
    const proposedRoot = MerkleTree.digestToHex(hash);
    return proposedRoot === this.root;
  }

  async save(filePath: string): Promise<void> {
    try {
      const fileStream = await fs.open(filePath, "w");
      for (const buf of this.nodes) {
        await fileStream.write(buf);
        await fileStream.write("\n");
      }
      await fileStream.close();
    } catch (error) {
      console.error("Error writing to file:", error);
    }
  }
}

export async function merkleTreeExample(keys?: string[]) {
  const names =
    keys ?? new Array(4).fill("").map((_) => faker.string.alphanumeric(7));

  console.log("creating tree");
  const tree = new MerkleTree().build(names);

  console.log(tree.prove(names.length - 1));
  console.log(
    tree.verify(names[names.length - 1], tree.prove(names.length - 1)),
  );

  // console.log("saving tree");
  // await tree.save("tree.dat");

  // console.log("proving from file");
  // console.log(await tree.proveFromFile("tree.dat", 0, names.length));

  console.log(tree.nodes.map((x) => MerkleTree.digestToHex(x)));
}
