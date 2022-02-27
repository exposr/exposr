import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import spinners from 'cli-spinners';

const Spinner = () => {
	const [frame, setFrame] = useState(0);
	const spinner = spinners['dots'];

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame(previousFrame => {
				const isLastFrame = previousFrame === spinner.frames.length - 1;
				return isLastFrame ? 0 : previousFrame + 1;
			});
		}, spinner.interval);

		return () => {
			clearInterval(timer);
		};
	}, [spinner]);

	return (
        <Text>{spinner.frames[frame]}</Text>
    );
};

export default Spinner;