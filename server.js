const http = require('http');
const Koa = require('koa');
const WS = require('ws');
const cors = require('@koa/cors');

const app = new Koa();
const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

const persons = [];

app.use(cors());

wsServer.on('connection', ws => {
	ws.on('message', msg => {
		const formattedMessage = JSON.parse(msg.toString('binary'));
		if (formattedMessage.event === 'checkNickName') {
			const haveNameInPersons = persons.some(
				person => person.nickName === formattedMessage.data.nick
			);
			if (haveNameInPersons) {
				ws.close(1000, 'Name already used');
			} else {
				ws.nickName = formattedMessage.data.nick;
				const allConnectedUsers = persons.map(person => person.nickName);

				persons.push(ws);
				ws.send(
					JSON.stringify({
						event: 'Connected',
						data: {
							allConnectedUsers: allConnectedUsers,
						},
					})
				);

				[...wsServer.clients]
					.filter(client => client.readyState === ws.OPEN)
					.forEach(client =>
						client.send(
							JSON.stringify({
								event: 'UserLogin',
								data: {
									nickName: ws.nickName,
								},
							})
						)
					);
			}
		} else if (formattedMessage.event === 'sendMessage') {
			const options = {
				hour: 'numeric',
				minute: 'numeric',
				day: 'numeric',
				month: 'numeric',
				year: 'numeric',
			};
			const now = new Date();
			const formattedDate = now.toLocaleDateString('ru-RU', options);
			[...wsServer.clients]
				.filter(client => client.readyState === WS.OPEN)
				.forEach(client =>
					client.send(
						JSON.stringify({
							event: 'sendMessage',
							data: {
								nickName: ws.nickName,
								date: formattedDate,
								text: formattedMessage.data.message,
							},
						})
					)
				);
		}
	});

	ws.on('close', () => {
		const idxClosed = persons.findIndex(
			person => person.nickName === ws.nickName
		);
		persons.splice(idxClosed, 1);
		[...wsServer.clients]
			.filter(client => client.readyState === ws.OPEN)
			.forEach(client =>
				client.send(
					JSON.stringify({
						event: 'UserLogout',
						data: {
							nickName: ws.nickName,
						},
					})
				)
			);
	});
});

server.listen(port);
