import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

export async function promptPairCode() {
  const rl = readline.createInterface({ input: stdin, output: stdout })

  console.log('')
  console.log('┌──────────────────────────────────────────────┐')
  console.log('│        COMANDINHA PRINT v0.1.0               │')
  console.log('└──────────────────────────────────────────────┘')
  console.log('')
  console.log('Cole o código de pareamento que apareceu no painel')
  console.log('do Comandinha (formato cmp-XXXX-XXXX-XXXX-XXXX):')
  console.log('')

  const code = (await rl.question('> ')).trim()
  rl.close()
  return code
}
