import { debug } from 'node:console';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart') //Buscar dados do localStorage 

    if (storagedCart) {
      return JSON.parse(storagedCart);//(como a funcao só aceita string ou null, precisa converter e depois reconverter para o array de produtos)
    }

    return []; //se for null, retorna um array vazio 
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart] //criando um novo array a partir do valor que ja tem no carrinho (mantendo a imutabilidade)
      const productExists = updatedCart.find(product => product.id === productId) //verificando se o produto exite no carrinho
  
      const stock = await api.get(`/stock/${productId}`) //passando a rota do estoque
      const stockAmount = stock.data.amount //quantidade que tem em estoque 
      const currentAmount = productExists ? productExists.amount : 0 //quantidade atual do produto no carrinho
      const amount = currentAmount + 1 //quantidade desejada para acrescentar
      
      // verificar se tem a quantidade no estoque
      if (amount > stockAmount) { // se a quantidade desejada for maior que o estoque...
        toast.error('Quantidade solicitada fora de estoque');
        return 
      }

      if (productExists) {
        productExists.amount = amount //se o produto ja existir no carrinho so atualiza a quantidade
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1 //acrescenta um porque sera a primeira vez que será colocado no carrinho 
        }
        updatedCart.push(newProduct)
      }

      // atualizando o carrinho 
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) //JSON.stringify(updatedCart) transformando em string 

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //verificar se o produto existe no carrinho
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId) //usa o findIndex para usar posteriormento o splice

      //se ele encontrar o item no carrinho
      if(productIndex >= 0) { //pq o productIndex retuna -1 
        updatedCart.splice(productIndex, 1) //o splice add ou remove algum item do array. Neste caso, esta apagando 1 produto
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        //se ele nao encontrar o item no carrinho 
        throw Error() //para sair do try e ir para o catch exibindo a mensagem de erro
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //trabalhando já com o valor desejado (o calculo sera feito na funcao de incrementar ou decrementar )
      if (amount <= 0) {
        return
      }

      //verificando estoque para conseguir incromentar a quantidade
      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      //verificando se o produto existe no carrinho
      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
