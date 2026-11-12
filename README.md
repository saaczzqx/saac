# Monta PC

Comparador de preço à vista para quem está montando um computador. A busca consulta a KaBuM! e a Terabyte, marca a oferta mais barata em estoque e soma as peças escolhidas.

O frete não entra na conta. O preço usado é o valor à vista (Pix ou boleto, quando a loja publica esse valor).

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
```

A montagem fica no `localStorage` do navegador. O botão **Atualizar preços** repete a busca de cada peça e avisa quando aparece uma opção mais barata.
