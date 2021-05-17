import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { groupBy, isEqual, uniqWith } from 'lodash-es';

async function getDictionary() {
    if (!existsSync('words_dictionary.json')) {
        const results = await axios.get('https://github.com/dwyl/english-words/raw/master/words_dictionary.json');
        writeFileSync('words_dictionary.json', JSON.stringify(results.data));
    }
    return JSON.parse(readFileSync('words_dictionary.json'));
}

const centerLetter = 'a';
const letters = ['c', 'c', 't', 'g', 'e', 'p', 'n', 'i'];

const start = new Date();

const counts = [];
const subsets = letters.reduce(
    (givenSet, setValue) => givenSet.concat(
        givenSet.map(givenSet => [setValue, ...givenSet])
    ),
    [[]]
);

let count = 0;
subsets.forEach(set => {
    if (set.length < 2) { return; }
    counts.push({});
    const _set = [centerLetter, ...set];
    _set.forEach(letter => counts[count][letter] = _set.filter(_letter => letter === _letter).length);
    count++;
});
const uniqueCounts = uniqWith(counts, isEqual);
const uniqueCountsLength = uniqueCounts.length;

(async function () {
    const dictionary = await getDictionary();

    const dictCounts = {};
    Object.keys(dictionary).forEach(word => {
        const _letters = word.split('');
        if (_letters.length < 3) { return; }
        const _count = {};
        _letters.forEach(letter => _count[letter] = _letters.filter(_letter => letter === _letter).length);
        dictCounts[word] = _count;
    })
    console.log(`dictionary length: ${Object.keys(dictCounts).length}`)

    const results = [];
    uniqueCounts.forEach((count, i) => {
        Object.entries(dictCounts).forEach(([word, _count]) => {
            if (isEqual(count, _count)) {
                results.push(word);
                console.log(`${('  ' + results.length).slice(-3)}: ${word} (~${Math.round(1000 * i / uniqueCountsLength) / 10}%)`);
            }
        })
    });

    const uniqueResults = uniqWith(results, isEqual).sort((a, b) => a.length - b.length || a.localeCompare(b));
    writeFileSync('results.json', JSON.stringify(uniqueResults, null, 2));
    const histogram = groupBy(uniqueResults, (_result) => _result.length);
    writeFileSync('histogram.json', JSON.stringify(histogram, null, 2));

    const end = new Date();
    console.log(`duration ${(end - start) / 1000} seconds`);
    console.log('total ' + uniqueResults.length);
    console.log('by length ', histogram);
})();
