import retext from 'retext';
import retextSmartypants from 'retext-smartypants';

export default function smartypants(file) {
	return retext()
		.use(retextSmartypants, { options: { dashes: 'oldschool' } })
		.processSync(file)
		.toString();
}
