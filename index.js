import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { groupBy, isEqual, uniq, uniqWith } from 'lodash-es';

async function getDictionary() {
    if (!existsSync('words_dictionary.json')) {
        const results = await axios.get('https://github.com/dwyl/english-words/raw/master/words_dictionary.json');
        writeFileSync('words_dictionary.json', JSON.stringify(results.data));
    }
    const dictionary = readFileSync('words_dictionary.json');
    console.log(`\ndictionary length: ${Object.keys(dictionary).length.toLocaleString()} words\n`);
    return JSON.parse(dictionary);
}

const centerLetter = 'a';
const letters = ['c', 'c', 't', 'g', 'e', 'p', 'n', 'i'];
const shortestWord = 3;
const longestWord = letters.length + 1;
console.log(`finding all words ${shortestWord}-${longestWord} letters long that all contain '${centerLetter}' and any subset of:`, letters.sort((a, b) => a.localeCompare(b)));

const start = new Date();

const histograms = [];
const subsets = letters.reduce(
    (givenSet, setValue) => givenSet.concat(
        givenSet.map(givenSet => [setValue, ...givenSet])
    ),
    [[]]
);

let index = 0;
subsets.forEach(subset => {
    if (subset.length < shortestWord - 1) { return; }
    const _subset = [centerLetter, ...subset];
    histograms.push({ length: _subset.length, histogram: {} });
    _subset.forEach(letter => histograms[index].histogram[letter] = _subset.filter(_letter => letter === _letter).length);
    index++;
});
const uniqueHistograms = uniqWith(histograms, isEqual);

(async function () {
    const dictionary = await getDictionary();

    const correctLengthWords = Object.keys(dictionary).filter(word => word.length >= shortestWord && word.length <= longestWord);
    const dictionaryHistogram = groupBy(correctLengthWords.map((word) => {
        const _letters = word.split('');
        const histogram = {};
        uniq(_letters).forEach(letter => histogram[letter] = _letters.filter(_letter => letter === _letter).length);
        return { word, histogram };
    }), (_entry) => _entry.word.length);

    const results = [];
    uniqueHistograms.forEach((wordHistogram) => {
        Object.entries(dictionaryHistogram)
            .filter(([wordLength]) => +wordLength === wordHistogram.length)
            .forEach(([_, dictionaryEntries]) => {
                dictionaryEntries.forEach((dictionaryEntry) => {
                    if (isEqual(wordHistogram.histogram, dictionaryEntry.histogram)) {
                        results.push(dictionaryEntry.word);
                        console.log(`${results.length}: ${dictionaryEntry.word}`);
                    }
                })
            })
    });

    const uniqueResults = results.sort((a, b) => a.length - b.length || a.localeCompare(b));
    writeFileSync('results.json', JSON.stringify(uniqueResults, null, 2));
    const histogram = groupBy(uniqueResults, (_result) => _result.length);
    writeFileSync('histogram.json', JSON.stringify(histogram, null, 2));

    const end = new Date();
    console.log(`\n${uniqueResults.length} results in ${(end - start) / 1000} seconds`);
    console.log(`longest word: '${results.slice(-1)[0]}'`);
})();
