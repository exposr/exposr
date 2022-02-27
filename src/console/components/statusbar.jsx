import React from 'react';
import {Text, Box} from 'ink';
import Emoji from 'node-emoji';
import Spinner from './spinner.js';

export const Statusbar = (props) => {

	const stateSymbol = {
		'success': Emoji.get('sparkles'),
		'fail': <Text color={'red'} bold> ✘ </Text>,
		'info': <Text color={'white'}> ● </Text>,
		'spinner': <Text> <Spinner/></Text>
	};

	const getSymbol = (state) => {
		return stateSymbol[state] ?? '';
	};

    return (
        <>
			<Box height={1} width="100%" flexGrow={1}>
				<Box paddingRight={1}>
					<Text>{getSymbol(props.state)}</Text>
				</Box>
				<Text bold>{props.line}</Text>
			</Box>
		</>
	);
};

export default Statusbar;