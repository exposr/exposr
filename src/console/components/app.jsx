import React from 'react';
import {render, Box} from 'ink';

import Logger from './logger.js';
import Statusbar from './statusbar.js';

class App extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			log: {},
			status: {},
		};

		this.props.callback((data) => {
			this.onChange(data);
		});
	}

	onChange(data) {
		const next = {
            ...this.state,
            ...data,
		};
		this.setState(next);
	}

	render() {
		return (
			<Box flexGrow={1} flexDirection='column'>
				<Box>
					<Logger log={this.state.log}/>
				</Box>
				<Box margin="0" paddingTop="1" paddingBottom="0" alignSelf="flex-end">
					<Statusbar state={this.state.status.state} line={this.state.status.line} />
				</Box>
			</Box>
		)
	}
}

export const createApp = async () => {
	return new Promise((resolve) => {
		const callback = (update) => {
			resolve({
				update,
				refresh: () => { rerender(app) },
			});
		};
		const app = (
			<App callback={callback}/>
		);
		const {rerender} = render(app);
	});
};

export const renderApp = (app) => {
	render(app);
};