import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Select from 'react-select';

const monthOrder = ['M-4', 'M-3', 'M-2', 'M-1', 'Launch Month', 'M1', 'M2', 'M3', 'M4'];
const colors = ['#FF0000', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1', '#a4e4f3', '#d0ed57'];

const GameRevenueChart = () => {
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [selectedGames, setSelectedGames] = useState(['Vanguard Revenue Model']);
  const [gameOptions, setGameOptions] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [isNormalized, setIsNormalized] = useState(false);
  const [vanguardModel, setVanguardModel] = useState(null);
  const [showMedian, setShowMedian] = useState(false);

  useEffect(() => {
    Papa.parse(`${process.env.PUBLIC_URL}/game_revenue_data.csv`, {
      download: true,
      header: true,
      complete: (results) => {
        setRawData(results.data);
        const uniqueGenres = [...new Set(results.data.map(game => game.Genre))];
        setGenres(['All', ...uniqueGenres]);
        const vanguard = results.data.find(game => game.Game === 'Vanguard Revenue Model');
        setVanguardModel(vanguard);
      }
    });
  }, []);

  const filteredGames = useMemo(() => {
    return rawData.filter(game => 
      game.Game !== 'Vanguard Revenue Model' &&
      (selectedGenre === 'All' || game.Genre === selectedGenre)
    );
  }, [rawData, selectedGenre]);

  useEffect(() => {
    setGameOptions(filteredGames.map(game => ({ value: game.Game, label: game.Game })));
  }, [filteredGames]);

  useEffect(() => {
    if (rawData.length > 0 && vanguardModel) {
      const processed = monthOrder.map(month => {
        const dataPoint = { month };
        
        filteredGames.forEach(game => {
          let value = parseFloat(game[month]);
          if (isNormalized) {
            const peak = Math.max(...monthOrder.map(m => parseFloat(game[m])));
            value = value / peak;
          }
          dataPoint[game.Game] = value * 100;
        });

        if (showMedian) {
          const relevantGames = selectedGenre === 'All' ? rawData.filter(g => g.Game !== 'Vanguard Revenue Model') : filteredGames;
          const values = relevantGames.map(game => {
            let value = parseFloat(game[month]);
            if (isNormalized) {
              const peak = Math.max(...monthOrder.map(m => parseFloat(game[m])));
              value = value / peak;
            }
            return value;
          });
          const sortedValues = values.sort((a, b) => a - b);
          const median = sortedValues.length % 2 === 0
            ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
            : sortedValues[Math.floor(sortedValues.length / 2)];
          dataPoint[`Median ${selectedGenre}`] = median * 100;
        }

        let vanguardValue = parseFloat(vanguardModel[month]);
        if (isNormalized) {
          const peak = Math.max(...monthOrder.map(m => parseFloat(vanguardModel[m])));
          vanguardValue = vanguardValue / peak;
        }
        dataPoint['Vanguard Revenue Model'] = vanguardValue * 100;
        
        return dataPoint;
      });
      setProcessedData(processed);
    }
  }, [rawData, filteredGames, isNormalized, vanguardModel, showMedian, selectedGenre]);

  const handleGameSelection = (selectedOptions) => {
    setSelectedGames(selectedOptions.map(option => option.value));
  };

  const allSelectedGames = useMemo(() => {
    if (showMedian) {
      return ['Vanguard Revenue Model', `Median ${selectedGenre}`];
    }
    return ['Vanguard Revenue Model', ...selectedGames];
  }, [selectedGames, showMedian, selectedGenre]);

  const formatYAxis = (tickItem) => {
    return `${tickItem.toFixed(0)}%`;
  };

  const formatTooltip = (value, name) => {
    return [`${value.toFixed(2)}%`, name];
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>Game Revenue Chart</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center' }}>
          Genre:
          <select 
            value={selectedGenre} 
            onChange={(e) => setSelectedGenre(e.target.value)}
            style={{ marginLeft: '5px', padding: '5px' }}
          >
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={isNormalized} 
            onChange={(e) => setIsNormalized(e.target.checked)} 
          />
          <span style={{ marginLeft: '5px' }}>Normalize Data</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={showMedian} 
            onChange={(e) => setShowMedian(e.target.checked)} 
          />
          <span style={{ marginLeft: '5px' }}>Show Median</span>
        </label>
      </div>

      {!showMedian && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Select games to compare:</h3>
          <Select
            isMulti
            name="games"
            options={gameOptions}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleGameSelection}
            value={selectedGames.map(game => ({ value: game, label: game }))}
          />
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          {allSelectedGames.map((game, index) => (
            <Line 
              key={game} 
              type="monotone" 
              dataKey={game} 
              stroke={game === 'Vanguard Revenue Model' ? colors[0] : 
                     game.startsWith('Median') ? '#0000FF' :
                     colors[(index + 1) % colors.length]} 
              strokeWidth={game === 'Vanguard Revenue Model' || game.startsWith('Median') ? 3 : 2}
              activeDot={{ r: 8 }} 
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GameRevenueChart;