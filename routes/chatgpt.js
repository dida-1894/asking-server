const router = require('koa-router')()
const { Configuration, OpenAIApi } = require("openai");
const { secretKey, prePrompt } = require('../config')
const configuration = new Configuration({
  apiKey: secretKey,
});

const openai = new OpenAIApi(configuration);

router.prefix('/chatgpt')

const getAnwser = async (ctx, next) => {
  const prompt = `${prePrompt} ${ctx.request.body.question}`
  try {
    const res = await openai.createCompletion({
        model: "gpt-3.5-turbo",
        prompt,
        max_tokens: 100,
        temperature: 0,
        stream: true,
    }, { responseType: 'stream' });
    let anwser = ''
    res.data.on('data', data => {
        const lines = data.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            const message = line.replace(/^data: /, '');
            if (message === '[DONE]') {
                ctx.body = {
                  code: 0,
                  data: anwser,
                  errmsg: '',
                }
                return; // Stream finished
            }
            try {
                const parsed = JSON.parse(message);
                anwser += parsed
                console.log(parsed.choices[0].text);
            } catch(error) {
                console.error('Could not JSON parse stream message', message, error);
            }
        }
    });
  } catch (error) {
      if (error.response?.status) {
          console.error(error.response.status, error.message);
          error.response.data.on('data', data => {
              const message = data.toString();
              try {
                  const parsed = JSON.parse(message);
                  console.error('An error occurred during OpenAI request: ', parsed);
              } catch(error) {
                  console.error('An error occurred during OpenAI request: ', message);
              }
          });
      } else {
          console.error('An error occurred during OpenAI request', error);
      }
  }

  next()
}

router.post('/asking', function (ctx, next) {
  getAnwser(ctx, next)
})

router.get('/bar', function (ctx, next) {
  ctx.body = 'this is a users/bar response'
})

module.exports = router
