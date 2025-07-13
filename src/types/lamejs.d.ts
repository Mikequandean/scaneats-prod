declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, bitRate: number);
    encodeBuffer(pcm: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}
