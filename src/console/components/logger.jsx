import React, {useState, useEffect} from 'react';
import {Static, Text, Box} from 'ink';
import Spinner from './spinner.js';

export const Logger = (props) => {

    const statusSymbol = {
		'fail': <Text color={'red'} bold> ✘</Text>,
		'warn': <Text color={'yellow'} bold> !</Text>,
		'error': <Text color={'red'} bold> !</Text>,
		'success': <Text color={'green'} bold> ✔</Text>,
		'done': <Text color={'white'}> ●</Text>,
	};

    const [state, setState] = useState({
        lines: [],
        current: undefined,
    });

    let id = 0;
    useEffect(() => {

        if (props.log.status == undefined) {
            setState(prevState => {
                return {
                    ...prevState,
                    current: props.log.line,
                }
            })
        } else {
            const line = `${state.current != undefined ? state.current : ''}${props.log.line != undefined ? props.log.line : ''}`;
            setState(prevState => {
                return {
                    lines: [
                        ...prevState.lines,
                        {
                            id: id++,
                            data: line,
                            status: props.log.status,
                        }
                    ],
                    current: undefined
                }
            });
        }
    }, [props.log]);

    return (
        <>
	        <Box height="100%" width="100%">
                <Static items={state.lines}>
                    {line => (
                        <Box key={line.id}>
                            <Box paddingRight={1}>
                                <Text>{statusSymbol[line.status]}</Text>
                            </Box>
                            <Text>{line.data}</Text>
                        </Box>
                    )}
                </Static>
                {state.current != undefined && <>
                    <Box>
                        <Box paddingRight={1}><Spinner/></Box>
                        <Text>{state.current}</Text>
                    </Box>
                </>}
            </Box>
        </>
    );
};

export default Logger;