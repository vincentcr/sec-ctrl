async function create<TMessage>(
  name: string,
  processor: (msg: TMessage) => void,
) {}
